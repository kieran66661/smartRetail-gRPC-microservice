const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('smartShelf.proto');
const smartShelf = grpc.loadPackageDefinition(packageDefinition).smartRetail;

const productStock = [
    { name: 'ProductA', quantity: 10, location: 'bay1', category: 'Fruit'},
    { name: 'ProductB', quantity: 20, location: 'bay2', category: 'Veg'},
    { name: 'ProductC', quantity: 15, location: 'bay3', category: 'Meat'},
    { name: 'ProductD', quantity: 15, location: 'bay3', category: 'Fruit'},
    { name: 'ProductE', quantity: 15, location: 'bay3', category: 'Veg'},
];

function listProducts(call) {
    productStock.forEach(product => {
        const productData = { 
            product_name: product.name,
            category: product.category
        };
        call.write(productData);
    });
    call.end();
}

function getProductInfo(call, callback) {
    const productName = call.request.product_name;
    const product = productStock.find(p => p.name === productName);
    if (productQuantity > 0) {
        const directions = getProductDirections(productLocation);
        const productInfo = {
            productName: product.name,
            stockAvailable: product.quantity,
            directions: directions
        };
        callback(null, `${product.name} is in stock in ${product.directions}`);
    } else {
        console.log(`${product.name} is currently out of stock`);
        callback(null,`${product.name} is currently out of stock`);
    }
}

function getProductDirections(productLocation) {
    let directions = '';
    if (location === 'bay1') {
        directions = 'aisle 2, shelf 3';
    } else if (location === 'bay2') {
        directions = 'aisle 4, shelf 5';
    } else if (location === 'bay3') {
        directions = 'aisle 4, shelf 6';
    } else {
        directions = '(location unknown)';
    }
    return directions;
}

function updateStock(call, callback) {
    call.on('data', (request) => {
        const productName = request.product_name;
        const quantity = request.quantity;
        const productIndex = productStock.findIndex(p => p.name === productName);
        if (productIndex !== -1) {
            const currentQuantity = productStock[productIndex].quantity;
            if (currentQuantity >= quantity) {
                productStock[productIndex].quantity = currentQuantity - quantity;
            } else {
                call.emit('error', {
                    code: grpc.status.INVALID_ARGUMENT,
                    message: 'Insufficient stock of ' + productName,
                });
            }
        } else {
            call.emit('error', {
                code: grpc.status.NOT_FOUND,
                message: productName + ' not found',
            });
        }
    });
    call.on('end', () => {
        callback(null, { success: true });
    });
}

const server = new grpc.Server();

server.addService(smartShelf.SmartShelf.service, {
    ListProducts: listProducts,
    GetProductInfo: getProductInfo,
    UpdateStock: updateStock
});

server.bindAsync('0.0.0.0:50053', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Failed to bind server:', err);
        return;
    }
    console.log(`Smart Shelf server running at ${port}`);
});