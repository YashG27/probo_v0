import express from 'express';
export const app = express();
app.use(express.json())
let INR_BALANCES = {
    user1 : {
        balance : 0,
        locked : 0
    },
    user2 : {
        balance : 0,
        locked : 0
    }
}

let ORDERBOOK = {
    BTC_USDT_10_Oct_2024_9_30: {
             yes: {
                 9.5: {
                     total: 12,
                     orders: {
                         user1: 2,
                         user2: 10
                     }
                 },
                 8.5: {
                     total: 12,
                     orders: {
                         user1: 3,
                         user2: 3,
                         user3: 6
                     }
                 },
             },
    }
 }

 
let STOCK_BALANCES = {
	user1: {
	   "BTC_USDT_10_Oct_2024_9_30": {
		   yes: {
			   quantity: 1,
			   locked: 0
		   }
	   }
	},
	user2: {
		"BTC_USDT_10_Oct_2024_9_30": {
		   no: {
			   quantity: 3,
			   locked: 4
		   }
	   }
	}
}

//route to create a user
app.post('/user/create/:userId', (req, res) => {
    const userId = req.params.userId
    INR_BALANCES = {
        ...INR_BALANCES,
        [userId] : {
            balance : 0,
            locked  : 0
        }
    }
    STOCK_BALANCES = {
        ...STOCK_BALANCES,
        [userId] : {}
    }
    return res.status(201).json({
        message : `User ${userId} created`
    })
    
})
  //route to create a stock symbol  
app.post('/symbol/create/:stockSymbol', (req, res) =>{
    const symbol = req.params.stockSymbol
    const users = Object.keys(STOCK_BALANCES);
    for (const user of users){
        STOCK_BALANCES[user] = STOCK_BALANCES[user] || {};
        STOCK_BALANCES[user][symbol] = {
            yes : {
                quantity : 0,
                locked : 0
            },
            no : {
                quantity : 0,
                locked : 0
            }
        }   
    }
    // ORDERBOOK = {
    //     ...ORDERBOOK,
    //     [symbol] : {
    //         yes : {
    //             total : {},
    //             orders : {}
    //         },
    //         no : {
    //             total : {},
    //             orders : {}
    //         }
    //     }
    // }
    return res.status(201).json({
        message : `Symbol ${symbol} created`
    })
})

//route to get the orderbook
app.get('/orderbook', (req, res) => {
    return res.status(200).json({
        ORDERBOOK
    })
})

//route to get the inr balances
app.get('/balances/inr', (req, res) => {
    return res.status(200).json({
        INR_BALANCES
    })
})

//route to get all the stock balances
app.get('/balances/stock', (req, res) => {
    return res.status(200).json({
        STOCK_BALANCES
    })
})

//route to get the inr balance of a specific user
app.get('/balance/inr/:userId', (req, res) => {
    const userId = req.params.userId;
    const balance = INR_BALANCES[userId]
    return res.status(200).json({
        balance
    })
})

// route for onramp
app.post('/onramp/inr', (req, res) => {
   const {userId, amount} = req.body;
   INR_BALANCES[userId]["balance"] += parseInt(amount)
   return res.status(200).json({
    message : `Onramped ${userId} with amount ${amount}`
   })
})  

app.get('/balance/stock/:userId', (req, res) => {
    const userId = req.params.userId
    const balance = STOCK_BALANCES[userId];
    return res.status(200).json({
        balance
    })
})

app.post('/trade/mint', (req, res) => {
    const { userId, stockSymbol, quantity} = req.body
    if(!INR_BALANCES[userId]){
        return res.status(401).json({
            message : "User not found"
        })
    }
    const eligible = INR_BALANCES[userId]["balance"] >= quantity * 1000
    if (!eligible){
        return res.json({
            message : "Insufficient balance"
        })
    }
    INR_BALANCES[userId]["balance"] -= quantity * 1000
    // STOCK_BALANCES = {
    //     ...STOCK_BALANCES,
    //     [userId] : {
    //         [stockSymbol] : {
    //             yes : {
    //                 quantity : quantity,
    //                 locked : 0
    //             },
    //             no : {
    //                 quantity : quantity,
    //                 locked : 0
    //             }
    //         }
    //     }
    // }
    STOCK_BALANCES[userId][stockSymbol]["yes"]["quantity"] += quantity
    STOCK_BALANCES[userId][stockSymbol]["no"]["quantity"] += quantity
    return res.status(200).json({
        messasge : `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${INR_BALANCES[userId]["balance"]} `
    })
})

app.get('/orderbook/:stockSymbol', (req, res) => {
    const stockSymbol = req.params.stockSymbol;
    if(!ORDERBOOK[stockSymbol]){
        return res.status(401).json({
            message : "Stock doesnt exist!"
        })
    }
    const orderBook = ORDERBOOK[stockSymbol]
    return res.json({
        orderBook
    })
})

app.post('/order/sell', (req, res) => {
    const { userId, stockSymbol, quantity, stockType} = req.body;
    const price = req.body.price / 100

    const eligible = STOCK_BALANCES[userId] &&
    STOCK_BALANCES[userId][stockSymbol] &&
    STOCK_BALANCES[userId][stockSymbol][stockType] &&
    STOCK_BALANCES[userId][stockSymbol][stockType]["quantity"] >= quantity;

    if (!eligible){
        return res.status(400).json({
            message : "Insufficient stock balance"
        })
    }
    if(quantity <= 0){
        return res.status(400).json({
            message : "Quantity should be > 0"
        })
    }

    STOCK_BALANCES[userId][stockSymbol][stockType]["quantity"] -= quantity
    STOCK_BALANCES[userId][stockSymbol][stockType]["locked"] += quantity

    // if(!(ORDERBOOK[stockSymbol])){
    //     ORDERBOOK = {
    //         ...ORDERBOOK,
    //         [stockSymbol] : {
    //             [price] : {
    //                 total : quantity,
    //                 orders : {
    //                     [userId] : quantity
    //                 }    
    //             }
    //         }
    //     }}

     // Initialize ORDERBOOK for the stockSymbol if it doesn't exist
     if (!ORDERBOOK[stockSymbol]) {
        ORDERBOOK[stockSymbol] = { yes : {}, no : {}};
    }

    // Initialize stockType inside ORDERBOOK if it doesn't exist
    if (!ORDERBOOK[stockSymbol][stockType]) {
        ORDERBOOK[stockSymbol][stockType] = {};
    }

    // Initialize price level if it doesn't exist
    if (!ORDERBOOK[stockSymbol][stockType][price]) {
        ORDERBOOK[stockSymbol][stockType][price] = {
            total: 0,
            orders: {}
        };
    }
     ORDERBOOK[stockSymbol][stockType][price]["orders"][userId] += quantity
     ORDERBOOK[stockSymbol][stockType][price]["total"] += quantity

    return res.status(200).json({
        message : `Sell order placed for ${quantity} '${stockType}' options at price ${price}`
    });
})
//Function to check if orderbook for values exist if not create them
function checkOrderbook(stockSymbol, stockType, price){
    if (!ORDERBOOK[stockSymbol]) ORDERBOOK[stockSymbol] = {};
    if (!ORDERBOOK[stockSymbol][stockType]) ORDERBOOK[stockSymbol][oppType] = {};
    if (!ORDERBOOK[stockSymbol][stockType][price]) {
        ORDERBOOK[stockSymbol][stockType][price] = {
            orders: {},
            total: 0
        };
    }
}
app.post('/order/buy', (req, res) => {
    const { userId, stockSymbol, quantity, stockType} = req.body
    const oppType = stockType === 'yes' ? 'no' : 'yes';
    const price = req.body.price / 100
    const amount = quantity * price;
    
    if( price < 0 || price > 10){
        return res.status(411).json({
            message : "Price should be within 0-10"
        })
    }
    const oppPrice = 10 - price
    
    if (!INR_BALANCES[userId]) {
        return res.status(400).json({
            message : "User Not found!"
        })
    }

    const eligible = INR_BALANCES[userId].balance >= amount
    if(!eligible){
        return res.status(411).json({
            message : "Insufficient balance"
        })
    }
    //lock the INR balance amount 
    INR_BALANCES[userId]['balance'] -= amount
    INR_BALANCES[userId]['locked'] += amount
    //sorted price
    // Ensure stockSymbol, stockType, and price exist in the ORDERBOOK before accessing them
    checkOrderbook(stockSymbol, stockType, price)

    //Sort the price in ascending order
    const sortedPrice = Object.keys(ORDERBOOK[stockSymbol][stockType]).sort((a, b) => parseFloat(a) - parseFloat(b));
    let remaining = quantity
    if (sortedPrice.length > 0 && price >= sortedPrice[0]){
        for ( const updatedPrice of sortedPrice){
            if( updatedPrice > price) break
            const orders =  ORDERBOOK[stockSymbol][stockType][updatedPrice]["orders"];
            for (const seller in orders){
                if (remaining <= 0) break
                const currentSeller = orders[seller]

                const valueToReduce = Math.min(currentSeller, remaining)
                //Reduce the values from the orderbook
                ORDERBOOK[stockSymbol][stockType][updatedPrice]['orders'][seller] -= valueToReduce
                ORDERBOOK[stockSymbol][stockType][updatedPrice]['total'] -= valueToReduce

                if(!STOCK_BALANCES[userId][stockSymbol]){
                    STOCK_BALANCES[userId][stockSymbol]={};
                }
                if(!STOCK_BALANCES[userId][stockSymbol][stockType]){
                    STOCK_BALANCES[userId][stockSymbol][stockType]={quantity:0,locked:0};
                }
                //update the stock balances for the buyer and the seller
                STOCK_BALANCES[userId][stockSymbol][stockType]['quantity'] += valueToReduce
                STOCK_BALANCES[seller][stockSymbol][stockType]['locked'] -= valueToReduce

                //Update the INR balances
                INR_BALANCES[seller]['balance'] += valueToReduce * updatedPrice * 100 
                INR_BALANCES[userId]['locked'] -= valueToReduce * updatedPrice * 100
                

                remaining -= valueToReduce * price * 100

                //Remove the user for qty 0 from orderbook
                if(orders[seller] === 0){
                    delete ORDERBOOK[stockSymbol][stockType][price]['orders'][seller]
                }
                //Remove the stock
                if( ORDERBOOK[stockSymbol][stockType][updatedPrice]['total'] === 0){
                    delete ORDERBOOK[stockSymbol][stockType][updatedPrice]
                }
                return res.status(200).json({
                    message : `Buy order matched at price ${price} paise`
                })
            }
        }
        if (remaining > 0){
            // Ensure stockSymbol, oppType, and oppPrice exist in the ORDERBOOK before accessing them
            checkOrderbook(stockSymbol, oppType, oppPrice)

            ORDERBOOK[stockSymbol][oppType][oppPrice]['orders'][userId] += remaining
            ORDERBOOK[stockSymbol][oppType][oppPrice]['total'] += remaining
            return res.status(201).json({
                message : `Buy order matched partially, ${remaining} remaining`
            }) 
        }
    }else {
        // Ensure stockSymbol, oppType, and oppPrice exist in the ORDERBOOK before accessing them
        checkOrderbook(stockSymbol, oppType, oppPrice)

        ORDERBOOK[stockSymbol][oppType][oppPrice]['orders'][userId] += remaining
        ORDERBOOK[stockSymbol][oppType][oppPrice]['total'] += remaining
        return res.status(200).json({
            message : 'Buy Order placed and pending'
        })
    }





//     const hasMatch = Object.keys(ORDERBOOK[stockSymbol][stockType]).includes(price);
//     if(hasMatch){
//         const orders =  ORDERBOOK[stockSymbol][stockType][price]["orders"];
//         const remaining = quantity
//         for (const seller in orders){
//             if (remaining <= 0) break
//             const currentSeller = orders[seller]

//             const valueToReduce = Math.min(currentSeller, remaining)
//             //Reduce the values from the orderbook
//             ORDERBOOK[stockSymbol][stockType][price]['orders'][seller] -= valueToReduce
//             ORDERBOOK[stockSymbol][stockType][price]['total'] -= valueToReduce

//             //update the stock balances for the buyer and the seller
//             STOCK_BALANCES[seller][stockSymbol][stockType]['locked'] -= valueToReduce
//             STOCK_BALANCES[userId][stockSymbol][stockType]['quantity'] += valueToReduce

//             //Update the INR balances 
//             INR_BALANCES[userId]['locked'] -= valueToReduce * price * 100
//             INR_BALANCES[userId][seller]['balance'] += valueToReduce * price * 100

//             remaining -= valueToReduce * price * 100
            
//             if(orders[seller] === 0){
//                 delete ORDERBOOK[stockSymbol][stockType][price]['orders'][seller]
//             }
//         }
//         if (remaining > 0){
//             ORDERBOOK[stockSymbol][oppType][price]['orders'][userId] += remaining
//             ORDERBOOK[stockSymbol][oppType][price]['total'] += remaining
//             return res.status(201).json({
//                 message : `Buy order matched partially, ${remaining} remaining`
//             }) 
//         }
//         return res.status(200).json({
//             message : `Buy order matched at price ${price} paise`
//         })
//     } else {
         
//     }
})
app.listen(3000)
