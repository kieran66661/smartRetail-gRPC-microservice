//import the grpc module, protoLoader module, load the smartShelf.proto and the protocall buffer package definition
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('smartShelf.proto');
const smartShelf = grpc.loadPackageDefinition(packageDefinition).smartRetail;

//sinulate product Stock data
const productStock = [
    { name: 'ProductA', quantity: 10, location: 'bay1', price: 1590, category:'Fruit'},
    { name: 'ProductB', quantity: 20, location: 'bay2', price: 990, category: 'Veg'},
    { name: 'ProductC', quantity: 16, location: 'bay3', price: 550, category: 'Meat'},
    { name: 'ProductD', quantity: 28, location: 'bay4', price: 500, category: 'Fruit'},
    { name: 'ProductE', quantity: 12, location: 'bay5', price: 1250, category: 'Other'},
];

//server side streaming of product names and category to the client
function getProductNames(call) {
    productStock.forEach(product => {
        call.write({ 
            name: product.name,
            category: product.category
        });
    });
    call.end();
}


//function to get the live current price of an item as it is added to the cart
function getPrice(call, callback) {
    const product_name = call.request.productName;
    console.log(product_name);

    const product = productStock.find(item => item.name === product_name);//scan the productStcok array to find the item
    console.log(product);

    if (product) { // if found reurn the product price
        callback(null, { price: product.price });
    } else { //or notify if not found
        callback({ code: grpc.status.NOT_FOUND, message: 'Product not found' });
    }
}

//fuction to check if an item is in stock as added to cart
function checkStock(call, callback) {
    const product_name = call.request.productName; 
    console.log(product_name);
    const product = productStock.find(p => p.name === product_name);//find the product
    console.log(product);
    if (product) {
        const requestedQuantity = call.request.quantity; //if found extract the call item quanity
        if (product.quantity >= requestedQuantity) { 
            callback(null, { success: true, message: 'Sufficient Stock' });// if the stock quanity is larger or equal to it return success
        } else {
            callback({ code: grpc.status.OUT_OF_RANGE, message: 'Insufficient Stock' });
        }
    } else {
        callback({ code: grpc.status.NOT_FOUND, message: 'Product not found' }); 
    }
}

//function to hadle requests to retrive product directions and stock
function getProductInfo(call, callback) { 
    const product_name = call.request.productName;
    console.log(product_name);
    const product = productStock.find(p => p.name === product_name);//find the product requested in the array
    console.log(product);
    if (product) {
        if (product.quantity > 0) { // if product found an dquanitity is over 0
            const directions = getProductDirections(product.location); //call the getProductDirections fuction with the location to get the corresponding direction to that shelf
            const productInfo = { //create a variable with required info to return
                productName: product.name,
                stockAvailable: product.quantity,
                directions: directions
            };
            callback(null, productInfo);
        } else {
            callback({ code: grpc.status.OUT_OF_RANGE, message: `${product.name} is currently out of stock` }); //return out of range error if not enough stock
        }
    } else {
        callback({ code: grpc.status.NOT_FOUND, message: 'Product not found' }); //not found error if product not found
    }
}

//fucnction to map the directions to the shelf
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

//client side streaming function, where server listens to stream of data from client
function updateStock(call, callback) {
    call.on('data', (request) => { //event handler listens for data event in the call object and extracts info
        const productName = request.productName;
        const quantity = request.quantity;
        const productIndex = productStock.findIndex(p => p.name === productName);
        const currentQuantity = productStock[productIndex].quantity;
        console.log(`Stock before purchase of ${productName}: ${currentQuantity}`);
        productStock[productIndex].quantity = currentQuantity - quantity;//update the quanity in the product stock array
        const quantityAfter = productStock[productIndex].quantity;
        console.log(`Stock after purchase of ${productName}: ${quantityAfter}`); //log updates
    });
    call.on('end', () => {//when end request is recived send back null and sucess true
        callback(null, { success: true });
    });
}

//create an instance of the server and add the services
const server = new grpc.Server();

server.addService(smartShelf.SmartShelf.service, {
    GetProductNames: getProductNames,
    GetPrice: getPrice,
    GetProductInfo: getProductInfo,
    UpdateStock: updateStock,
    CheckStock: checkStock,
});

//bind the server to the address 127.0.0.1 and port 50053 with callback fuction to display if connection successful
server.bindAsync('127.0.0.1:50053', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      console.error(err);
      return;
    }
    console.log(`Smart Shelf Server running at http://127.0.0.1:${port}`);
});
