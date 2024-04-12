const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('autonomousCheckout.proto');
const autonomousCheckout = grpc.loadPackageDefinition(packageDefinition).smartRetail;

let cart = [];

function addToCart(call, callback) {
    const { product_name, quantity, price } = call.request;
    cart.push({
        product_name: product_name,
        quantity: quantity,
        price: price
    });
    callback(null, { success: true, message: `${quantity} of ${product_name} added to the cart` });
}

function getCart(call, callback) {
    console.log('Retrieving cart');
    callback(null, { cart: cartArray });
}

function calculateTotal(call, callback) {
    let total = 0;
    call.on('data', product => {
        total += product.price * product.quantity;
        const user = users.find(user => user.session_id === call.request.session_id);
        if (user) {
            user.products.push(product);
        }
    });
    call.on('end', () => {
        console.log('Cart total:', total);
        callback(null, { total });
    });
}

function purchase(call, callback) {
    const { card_number, expiration_date, cvv } = call.request.card_details;
    if (card_number && expiration_date && cvv) {
        const total = call.request.total;
        console.log(`Charging card ${card_number} the total amount: ${total}`);
        callback(null, { success: true, message: 'Purchase successful' });
    } else {
        console.log('Invalid card details provided');
        callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Invalid card details' });
    }
}

const server = new grpc.Server();

server.addService(autonomousCheckout.AutonomousCheckout.service, {
    AddToCart: addToCart,
    GetCart: getCart,
    CalculateTotal: calculateTotal,
    Purchase: purchase
});

server.bindAsync('0.0.0.0:50054', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Failed to bind server:', err);
        return;
    }
    console.log(`Autonomous Checkout server running at ${port}`);
});


