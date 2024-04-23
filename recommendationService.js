//import the grpc module, protoLoader module, load the recommendation.proto and the protocall buffer package definition
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('recommendation.proto');
const recommendationService = grpc.loadPackageDefinition(packageDefinition).smartRetail;

//bidirectional streaming function to map the user inputed item to a similar item in promotion
function getPromotionalRecommendations(call) {
    const recommendations = {
        'ProductA': 'Buy one ProductJ get one free!',
        'ProductB': 'Save 20% on ProductK in store now',
        'ProductC': 'If you like ProductC, you should try ProductL',
        'ProductD': 'Try our new ProductM in store now!',
        'ProductE': '3 for the price of 2 on ProductN'
    };

    call.on('data', (product) => { //data event handler listning for data streamed from the client
        const productName = product.name;
        console.log(`Received request for promotional recommendation for product: ${productName}`);
        const recommendedPromotion = recommendations[productName]; //find corresponding recommendation for user inputed product

        if (recommendedPromotion) {
            console.log(`Sending promotion for product: ${productName}`);
            call.write({ promotion: recommendedPromotion }); //send back the promotion if found
        } else {
            console.log(`${productName} not found.`);
            call.write({promotion: `Product not found`}); //notify product not found otherwise

        }
    });

    call.on('end', () => { // end event handler listening for when client ends the stream
        console.log('Client stream ended');
        call.end();
    });

    call.on('error', (error) => { //error handler for any errors during the streaming process
        console.error('Error:', error.message);
        call.emit('end');
    });
}

//create an instance of the server and add the services
const server = new grpc.Server();

server.addService(recommendationService.Recommendation.service, {
    GetPromotionalRecommendations: getPromotionalRecommendations,
});

//bind the server to the address 127.0.0.1 and port 50052 with callback fuction to display if connection successful
server.bindAsync('127.0.0.1:50052', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      console.error(err);
      return;
    }
    console.log(`Reccomendation Server running at http://127.0.0.1:${port}`);
});