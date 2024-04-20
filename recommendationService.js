const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('recommendation.proto');
const recommendationService = grpc.loadPackageDefinition(packageDefinition).smartRetail;


function getPromotionalRecommendations(call) {
    const recommendations = {
        'ProductA': 'Buy one ProductJ get one free!',
        'ProductB': 'Save 20% on ProductK in store now',
        'ProductC': 'If you like ProductC, you should try ProductL',
        'ProductD': 'Try our new ProductM in store now!',
        'ProductE': '3 for the price of 2 on ProductN'
    };

    call.on('data', (product) => {
        const productName = product.name;
        console.log(`Received request for promotional recommendation for product: ${productName}`);
        const recommendedPromotion = recommendations[productName];

        if (recommendedPromotion) {
            console.log(`Sending promotion for product: ${productName}`);
            call.write({ promotion: recommendedPromotion });
        } else {
            console.log(`${productName} not found.`);
            call.write({promotion: `Product not found`});

        }
    });

    call.on('end', () => {
        console.log('Client stream ended');
        call.end();
    });

    call.on('error', (error) => {
        console.error('Error:', error.message);
        call.emit('end');
    });
}


const server = new grpc.Server();

server.addService(recommendationService.Recommendation.service, {
    GetPromotionalRecommendations: getPromotionalRecommendations,
});


server.bindAsync('127.0.0.1:50052', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      console.error(err);
      return;
    }
    console.log(`Reccomendation Server running at http://127.0.0.1:${port}`);
});