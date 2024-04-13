const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const trolleyPackageDefinition = protoLoader.loadSync('smarttrolley.proto');
const trolleyProto = grpc.loadPackageDefinition(trolleyPackageDefinition).smartTrolley;
const appPackageDefinition = protoLoader.loadSync('app.proto');
const appProto = grpc.loadPackageDefinition(appPackageDefinition).smart.retail;

const trolleyClient = new trolleyProto.SmartTrolley('localhost:50052', grpc.credentials.createInsecure());




//get cart
function getCart() {
  return new Promise((resolve, reject) => {
      // Make the RPC call to getCart
      client.getCart({}, (error, response) => {
          if (error) {
              console.error('Error retrieving cart:', error.message);
              reject(error);
              return;
          }
          // Resolve the promise with the cart data from the response
          resolve(response.cart);
      });
  });
}

//list products fucntion    
  
  function listProducts() {
    const call = client.listProducts({});
    const productsByCategory = {};
  
    call.on('data', function(productMessage) {
      const category = productMessage.product_type;
  
      if (!productsByCategory[category]) {
        productsByCategory[category] = [];
      }
        productsByCategory[category].push(productMessage.product_name);
    });
  
    call.on('end', function() {
      console.log('Products by Category:');
      for (const category in productsByCategory) {
        console.log(`Category: ${category}`);
        console.log(productsByCategory[category]);
        console.log(); 
      }
    });
  
    call.on('error', function(error) {
      console.error('Error:', error.message);
    });    
    call.on('status', function(status) {
      console.log('Status:', status);
    });  }

  //update stock call
  function updateStock() {
    // Create a call to the server's getCart function
    const callToGetCart = client.getCart({}, (error, response) => {
      if (error) {
        console.error('Error:', error.message);
      } else {
        console.log('Retrieved cart:', response.cart);
        
        // Inside the callback, send updates to the stock based on the cart data
        const cartData = response.cart;
  
        const callToUpdateStock = client.updateStock((error, response) => {
          if (error) {
            console.error('Error:', error.message);
          } else {
            console.log('Update Stock Response:', response);
          }
        });
  
        // Loop through each item in the cart and send updates
        cartData.forEach(item => {
          const update = {
            product_name: item.product_name,
            quantity: item.quantity
          };
          callToUpdateStock.write(update);
        });
  
        // Indicate that all updates have been sent
        callToUpdateStock.end();
      }
    });
  }

  function getPromotionalRecommendations(call) {
    const getCart = call.request;
  
    // Assuming getCart is a function that retrieves cart items
    getCart((err, response) => {
        if (err) {
            console.error('Error retrieving cart:', err);
            return;
        }
        
        const cartItems = response.cart;
        let currentIndex = 0;

        const intervalId = setInterval(() => {
            if (currentIndex < cartItems.length) {
                const recommendation = { recommendation: `Consider buying ${cartItems[currentIndex].productName}` };
                call.write(recommendation);
                currentIndex++;
            } else {
                clearInterval(intervalId);
                call.end(); // End the stream after sending all recommendations
            }
        }, 3000);
    });
}

//for add to cart

function getPrice(product_name) {
  return new Promise((resolve, reject) => {
      smartShelf.GetPrice({ product_name }, (error, response) => {
          if (error) {
              reject(error);
          } else {
              resolve(response.price);
          }
      });
  });
}

async function addToCart(product_name, quantity) {
  try {
      const instock = await checkStock(product_name, quantity);
      if (instock.success) {
          const price = await retrievePrice(product_name);
          const request = { product_name, quantity, price };
          autonomousCheckoutClient.AddToCart(request, (error, response) => {
              if (error) {
                  console.error('Error adding to cart:', error.message);
              } else {
                  console.log(response.message);
              }
          });
      } else {
          console.log(`Insufficient stock of ${product_name}`);
      }
  } catch (error) {
      console.error('Error:', error.message);
  }
}

function checkStock(product_name, quantity) {
  return new Promise((resolve, reject) => {
    client.checkStock({ product_name, quantity }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}
function getCart() {
  return new Promise((resolve, reject) => {
      // Make the RPC call to getCart
      client.getCart({}, (error, response) => {
          if (error) {
              console.error('Error retrieving cart:', error.message);
              reject(error);
              return;
          }
          // Resolve the promise with the cart data from the response
          resolve(response.cart);
      });
  });
}



function getPromotionalRecommendations() {
    // Call the getCart function to retrieve the cart data
    getCart()
        .then((cart) => {
            if (cart.length === 0) {
                // If the cart is empty, create a cart with three predefined products
                cart = ['ProductA', 'ProductB', 'ProductC'];
            }

            // Make the gRPC call to get promotional recommendations with client-side streaming
            const call = client.getPromotionalRecommendations((error, response) => {
                if (error) {
                    console.error('Error:', error.message);
                    return;
                }
                console.log('Received promotions:', response.promotions);
                // Process the received promotions, e.g., display them to the user
            });

            // Event listener for the end of the stream
            call.on('end', () => {
                console.log('Server stream ended');
            });

            // Sending cart data to the server
            cart.forEach((product) => {
                call.write({ name: product });
            });

            // Indicate the end of sending data
            call.end();
        })
        .catch((error) => {
            // If there's an error during cart retrieval, handle it appropriately
            console.error('Error retrieving cart:', error.message);
        });
}

  
  // Usage:
  listProducts();
