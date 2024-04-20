const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('smartShelf.proto');
const smartShelf = grpc.loadPackageDefinition(packageDefinition).smartRetail;


const productStock = [
    { name: 'ProductA', quantity: 10, location: 'bay1', price: 1590, category:'Fruit'},
    { name: 'ProductB', quantity: 20, location: 'bay2', price: 990, category: 'Veg'},
    { name: 'ProductC', quantity: 16, location: 'bay3', price: 550, category: 'Meat'},
    { name: 'ProductD', quantity: 28, location: 'bay4', price: 500, category: 'Fruit'},
    { name: 'ProductE', quantity: 12, location: 'bay5', price: 1250, category: 'Other'},
];


function getProductNames(call) {
    productStock.forEach(product => {
        call.write({ 
            name: product.name,
            category: product.category
        });
    });
    call.end();
}



function getPrice(call, callback) {
    const product_name = call.request.productName;
    console.log(product_name);

    const product = productStock.find(item => item.name === product_name);
    console.log(product);

    if (product) {
        callback(null, { price: product.price });
    } else {
        callback({ code: grpc.status.NOT_FOUND, message: 'Product not found' });
    }
}

function checkStock(call, callback) {
    const product_name = call.request.productName; 
    console.log(product_name);
    const product = productStock.find(p => p.name === product_name);
    console.log(product);
    if (product) {
        const requestedQuantity = call.request.quantity; // Get quantity from the request
        if (product.quantity >= requestedQuantity) { 
            callback(null, { success: true, message: 'Sufficient Stock' });
        } else {
            callback({ code: grpc.status.OUT_OF_RANGE, message: 'Insufficient Stock' });
        }
    } else {
        callback({ code: grpc.status.NOT_FOUND, message: 'Product not found' });
    }
}

function getProductInfo(call, callback) {
    const product_name = call.request.productName;
    console.log(product_name);
    const product = productStock.find(p => p.name === product_name);
    console.log(product);
    if (product) {
        if (product.quantity > 0) {
            const directions = getProductDirections(product.location);
            const productInfo = {
                productName: product.name,
                stock_available: product.quantity,
                directions: directions
            };
            callback(null, productInfo);
        } else {
            callback({ code: grpc.status.OUT_OF_RANGE, message: `${product.name} is currently out of stock` });
        }
    } else {
        callback({ code: grpc.status.NOT_FOUND, message: 'Product not found' });
    }
}

function getProductDirections(location) {
    let directions = '';
    if (location === 'bay1') {
        directions = 'aisle 2, shelf 3';
    } else if (location === 'bay2') {
        directions = 'aisle 4, shelf 5';
    } else if (location === 'bay3') {
        directions = 'aisle 4, shelf 6';
    } else if (location === 'bay4') {
        directions = 'aisle 3, shelf 5';
    } else if (location === 'bay5') {
        directions = 'aisle 1, shelf 6';
    } else {
        directions = 'location unknown';
    }
    return directions;
}

function updateStock(call, callback) {
    call.on('data', (request) => {
        const productName = request.productName;
        const quantity = request.quantity;
        const productIndex = productStock.findIndex(p => p.name === productName);
        const currentQuantity = productStock[productIndex].quantity;
        console.log(`Stock before purchase of ${productName}: ${currentQuantity}`);
        productStock[productIndex].quantity = currentQuantity - quantity;
        const quantityAfter = productStock[productIndex].quantity;
        console.log(`Stock after purchase of ${productName}: ${quantityAfter}`);
    });
    call.on('end', () => {
        callback(null, { success: true });
    });
}

const server = new grpc.Server();

server.addService(smartShelf.SmartShelf.service, {
    GetProductNames: getProductNames,
    GetPrice: getPrice,
    GetProductInfo: getProductInfo,
    UpdateStock: updateStock,
    CheckStock: checkStock,
});

server.bindAsync('127.0.0.1:50053', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      console.error(err);
      return;
    }
    console.log(`Smart Shelf Server running at http://127.0.0.1:${port}`);
});
